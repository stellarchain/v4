#!/usr/bin/env python3
"""
Create and install single-file skill bundles (*.skill).

This environment's skill system loads skills from directories that contain SKILL.md.
This script adds a convenient distribution format:

  - pack:    skill directory -> name.skill (a zip archive)
  - install: name.skill      -> $CODEX_HOME/skills/name (directory)

Notes:
  - ".skill" is not a native runtime format here; it is a packaging format.
  - Installation still results in a directory on disk, because that is what the loader uses.
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import stat
import tempfile
import zipfile
from pathlib import Path


_DEFAULT_CODEX_HOME = os.path.expanduser("~/.codex")
_SKILL_MD = "SKILL.md"

_IGNORE_BASENAMES = {
    ".DS_Store",
}

_IGNORE_DIRS = {
    "__pycache__",
    ".git",
    ".next",
    "node_modules",
}


class SkillBundleError(Exception):
    pass


def _codex_skills_dir() -> Path:
    codex_home = os.environ.get("CODEX_HOME", _DEFAULT_CODEX_HOME)
    return Path(codex_home).expanduser() / "skills"


def _is_safe_relpath(rel: str) -> bool:
    # Zip members always use forward slashes. We still treat both separators as suspicious.
    if rel.startswith("/") or rel.startswith("\\"):
        return False
    norm = os.path.normpath(rel)
    if norm == ".":
        return False
    if norm.startswith("..") or norm.startswith("../") or norm.startswith("..\\"):
        return False
    # Also block drive letters on Windows-like paths.
    if re.match(r"^[a-zA-Z]:", rel):
        return False
    return True


def _validate_skill_dir(skill_dir: Path) -> None:
    if not skill_dir.exists():
        raise SkillBundleError(f"Skill dir not found: {skill_dir}")
    if not skill_dir.is_dir():
        raise SkillBundleError(f"Not a directory: {skill_dir}")
    skill_md = skill_dir / _SKILL_MD
    if not skill_md.is_file():
        raise SkillBundleError(f"Missing {_SKILL_MD}: {skill_md}")


def _read_skill_name_from_frontmatter(skill_dir: Path) -> str | None:
    """
    Minimal parser: extracts "name:" from YAML frontmatter in SKILL.md.
    Avoids requiring PyYAML in the runtime environment.
    """
    content = (skill_dir / _SKILL_MD).read_text(encoding="utf-8", errors="replace")
    if not content.startswith("---"):
        return None
    # Frontmatter is between first two '---' lines.
    m = re.match(r"^---\s*\n([\s\S]*?)\n---\s*\n", content)
    if not m:
        return None
    front = m.group(1)
    for line in front.splitlines():
        if re.match(r"^\s*name\s*:", line):
            raw = line.split(":", 1)[1].strip()
            # Strip simple single/double quotes.
            raw = raw.strip().strip('"').strip("'").strip()
            return raw or None
    return None


def _validate_skill_name(name: str) -> None:
    if not name:
        raise SkillBundleError("Skill name is empty.")
    if name in (".", ".."):
        raise SkillBundleError(f"Invalid skill name: {name}")
    if os.path.sep in name or (os.path.altsep and os.path.altsep in name):
        raise SkillBundleError(f"Skill name must be a single path segment: {name}")
    # Enforce the convention used by the existing tooling.
    if not re.match(r"^[a-z0-9-]+$", name):
        raise SkillBundleError(f"Skill name must be hyphen-case: {name}")
    if name.startswith("-") or name.endswith("-") or "--" in name:
        raise SkillBundleError(f"Skill name must not start/end with '-' or contain '--': {name}")


def _iter_files_for_pack(skill_dir: Path) -> list[Path]:
    files: list[Path] = []
    for path in sorted(skill_dir.rglob("*")):
        rel_parts = path.relative_to(skill_dir).parts
        if not rel_parts:
            continue
        if any(part in _IGNORE_DIRS for part in rel_parts):
            continue
        if path.is_dir():
            continue
        if path.name in _IGNORE_BASENAMES:
            continue
        # Ignore compiled python files.
        if path.suffix in (".pyc", ".pyo"):
            continue
        files.append(path)
    return files


def _zipinfo_for(path: Path, arcname: str) -> zipfile.ZipInfo:
    zi = zipfile.ZipInfo(filename=arcname)
    # Preserve executable bit (best effort) on Unix-like systems.
    mode = path.stat().st_mode
    # Standard zip external_attr uses upper 16 bits for Unix mode.
    zi.external_attr = (mode & 0xFFFF) << 16
    return zi


def pack_skill_dir(skill_dir: Path, out_path: Path | None) -> Path:
    _validate_skill_dir(skill_dir)

    skill_name = _read_skill_name_from_frontmatter(skill_dir) or skill_dir.name
    _validate_skill_name(skill_name)

    out_path = out_path or Path.cwd() / f"{skill_name}.skill"
    out_path = out_path.expanduser().resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Bundle layout: one top-level folder (skill_name/...) for predictable installs.
    files = _iter_files_for_pack(skill_dir)
    with zipfile.ZipFile(out_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for file_path in files:
            rel = file_path.relative_to(skill_dir).as_posix()
            arcname = f"{skill_name}/{rel}"
            zi = _zipinfo_for(file_path, arcname)
            with open(file_path, "rb") as fh:
                zf.writestr(zi, fh.read())

    return out_path


def _safe_extract(zip_path: Path, dest_dir: Path) -> None:
    with zipfile.ZipFile(zip_path, "r") as zf:
        for info in zf.infolist():
            name = info.filename
            if not name or name.endswith("/"):
                continue
            if not _is_safe_relpath(name):
                raise SkillBundleError(f"Unsafe path in bundle: {name}")
            out = (dest_dir / name).resolve()
            if dest_dir.resolve() not in out.parents:
                raise SkillBundleError(f"Path traversal in bundle: {name}")
        zf.extractall(dest_dir)

        # Restore Unix permission bits from the zip metadata (best effort).
        for info in zf.infolist():
            name = info.filename
            if not name:
                continue
            is_dir = False
            try:
                is_dir = info.is_dir()
            except AttributeError:
                is_dir = name.endswith("/")
            if is_dir:
                continue
            mode = (info.external_attr >> 16) & 0o7777
            if not mode:
                continue
            out_path = dest_dir / name
            try:
                os.chmod(out_path, mode)
            except OSError:
                pass


def _find_extracted_skill_root(tmp_extract_dir: Path) -> Path:
    # Expect exactly one top-level directory.
    children = [p for p in tmp_extract_dir.iterdir() if p.name not in (".DS_Store",)]
    children = [p for p in children if p.is_dir()]
    if len(children) != 1:
        raise SkillBundleError(
            "Bundle must contain exactly one top-level directory (the skill folder)."
        )
    skill_root = children[0]
    if not (skill_root / _SKILL_MD).is_file():
        raise SkillBundleError(f"Extracted skill is missing {_SKILL_MD}: {skill_root}")
    return skill_root


def _copytree(src: Path, dest: Path) -> None:
    # shutil.copytree(..., dirs_exist_ok=...) is Python 3.8+; still keep force behavior explicit.
    shutil.copytree(src, dest, symlinks=True)
    # Ensure any +x bits are preserved on filesystems that support it.
    for path in dest.rglob("*"):
        if not path.is_file():
            continue
        try:
            src_mode = (src / path.relative_to(dest)).stat().st_mode
            os.chmod(path, stat.S_IMODE(src_mode))
        except OSError:
            pass


def install_bundle(bundle_path: Path, dest_root: Path | None, force: bool) -> Path:
    bundle_path = bundle_path.expanduser().resolve()
    if not bundle_path.is_file():
        raise SkillBundleError(f"Bundle not found: {bundle_path}")
    if bundle_path.suffix != ".skill":
        raise SkillBundleError("Bundle must have .skill extension.")

    dest_root = (dest_root or _codex_skills_dir()).expanduser().resolve()
    dest_root.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="skill-bundle-") as td:
        tmp_dir = Path(td)
        _safe_extract(bundle_path, tmp_dir)
        extracted_root = _find_extracted_skill_root(tmp_dir)

        skill_name = _read_skill_name_from_frontmatter(extracted_root) or extracted_root.name
        _validate_skill_name(skill_name)

        dest_dir = dest_root / skill_name
        if dest_dir.exists():
            if not force:
                raise SkillBundleError(f"Destination already exists: {dest_dir} (use --force)")
            shutil.rmtree(dest_dir)
        _copytree(extracted_root, dest_dir)
        return dest_dir


def _parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="skill_bundle.py", description="Pack/install *.skill bundles.")
    sub = p.add_subparsers(dest="cmd", required=True)

    pack = sub.add_parser("pack", help="Create a .skill bundle from a skill directory.")
    pack.add_argument("--src", required=True, help="Path to the skill directory (must contain SKILL.md).")
    pack.add_argument("--out", default=None, help="Output bundle path (default: ./$name.skill).")

    install = sub.add_parser("install", help="Install a .skill bundle into $CODEX_HOME/skills.")
    install.add_argument("--bundle", required=True, help="Path to the .skill file.")
    install.add_argument(
        "--dest-root",
        default=None,
        help="Destination root (default: $CODEX_HOME/skills or ~/.codex/skills).",
    )
    install.add_argument("--force", action="store_true", help="Overwrite if skill already exists.")

    return p.parse_args(argv)


def main(argv: list[str]) -> int:
    args = _parse_args(argv)
    try:
        if args.cmd == "pack":
            src = Path(args.src).expanduser().resolve()
            out = Path(args.out).expanduser().resolve() if args.out else None
            result = pack_skill_dir(src, out)
            print(str(result))
            return 0
        if args.cmd == "install":
            bundle = Path(args.bundle)
            dest_root = Path(args.dest_root) if args.dest_root else None
            dest = install_bundle(bundle, dest_root, force=bool(args.force))
            print(str(dest))
            return 0
        raise SkillBundleError(f"Unknown command: {args.cmd}")
    except SkillBundleError as exc:
        print(f"Error: {exc}", file=os.sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main(os.sys.argv[1:]))

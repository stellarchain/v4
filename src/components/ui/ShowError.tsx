interface ShowErrorProps {
  message: string;
}

export default function ShowError({ message }: ShowErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-red-500">
      {message}
    </div>
  );
}

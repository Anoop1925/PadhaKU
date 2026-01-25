import { ReactNode } from "react";

export const metadata = {
  title: "Quiz - PadhaKU",
  description: "Test your knowledge with our AI-generated quiz!",
};

export default function QuizLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

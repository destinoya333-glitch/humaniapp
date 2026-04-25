"use client";

import { useEffect, useRef } from "react";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

type Props = {
  messages: ChatMessage[];
  isLoading?: boolean;
};

export default function ConversationView({ messages, isLoading }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col gap-3 overflow-y-auto p-4 max-h-[60vh]">
      {messages.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-8">
          Press and hold the mic to start talking with Miss Sofia.
        </div>
      )}

      {messages.map((m, i) => (
        <div
          key={i}
          className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-900"
            }`}
          >
            {m.role === "assistant" && (
              <div className="text-[10px] font-semibold opacity-60 mb-1">
                Miss Sofia
              </div>
            )}
            {m.content}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-gray-100 rounded-2xl px-4 py-2 text-sm">
            <span className="inline-flex gap-1">
              <span className="animate-bounce">●</span>
              <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>●</span>
              <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>●</span>
            </span>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export const useSocket = () => {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io("http://localhost:5000");
    return () => socketRef.current?.disconnect();
  }, []);

  return socketRef.current;
};

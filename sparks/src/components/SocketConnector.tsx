import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import { connect, disconnect } from "../store/slices/socketSlice";

/**
 * Connects global socket when app has a valid auth token and disconnects when token is cleared.
 * Mount once inside Provider (e.g. root _layout) so socket connects as soon as app opens (when logged in).
 */
export function SocketConnector() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);
  const isLoading = useAppSelector((s) => s.auth.isLoading);
  const prevTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (token) {
      if (prevTokenRef.current !== token) {
        prevTokenRef.current = token;
        dispatch(connect());
      }
    } else {
      prevTokenRef.current = null;
      dispatch(disconnect());
    }
  }, [token, isLoading, dispatch]);

  return null;
}

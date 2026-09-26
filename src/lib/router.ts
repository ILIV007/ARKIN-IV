"use client";

import { useCallback, useEffect, useState } from "react";

export type Route =
  | { name: "home" }
  | { name: "games" }
  | { name: "game"; gameId: string }
  | { name: "scores" }
  | { name: "settings" }
  | { name: "about" }
  | { name: "trophies" };

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#\/?/, "").replace(/\/$/, "");
  if (!h) return { name: "home" };
  const parts = h.split("/");
  switch (parts[0]) {
    case "games":
      return parts[1]
        ? { name: "game", gameId: parts[1] }
        : { name: "games" };
    case "scores":
      return { name: "scores" };
    case "settings":
      return { name: "settings" };
    case "about":
      return { name: "about" };
    case "trophies":
      return { name: "trophies" };
    default:
      return { name: "home" };
  }
}

export function navigate(path: string) {
  if (typeof window === "undefined") return;
  const target = path.startsWith("#") ? path : "#" + path;
  if (window.location.hash === target) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  window.location.hash = target;
}

export function useHashRoute(): [Route, (path: string) => void] {
  const [route, setRoute] = useState<Route>({ name: "home" });

  useEffect(() => {
    const update = () => setRoute(parseHash(window.location.hash));
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  const go = useCallback((path: string) => {
    navigate(path);
  }, []);

  return [route, go];
}

"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { hashToRoute, routeToHash, type Route } from "@/lib/route";
import Auth from "./Auth";
import Footer from "./Footer";
import GameDetail from "./GameDetail";
import GamePlayer from "./GamePlayer";
import HallOfFame from "./HallOfFame";
import Library from "./Library";
import Nav from "./Nav";

export interface User {
  name: string;
}

export interface ScoreEntry {
  game: string;
  score: number;
  name: string;
}

export type Navigate = (r: Route) => void;

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";
const USER_EVENT = "av-user-change";

// ---------- hash → ruta (sin leer `location` durante el render del servidor) ----------
function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
const getHash = () => window.location.hash;
const getServerHash = () => "";

// ---------- av_user en localStorage ----------
function subscribeUser(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(USER_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(USER_EVENT, cb);
  };
}
function getUserRaw(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}
const getServerUserRaw = () => null;

function parseUser(raw: string | null): User | null {
  if (!raw) return null;
  try {
    const u = JSON.parse(raw);
    return u && typeof u.name === "string" ? { name: u.name } : null;
  } catch {
    return null;
  }
}

export default function ArcadeApp() {
  const hash = useSyncExternalStore(subscribeHash, getHash, getServerHash);
  const route = useMemo(() => hashToRoute(hash), [hash]);

  const userRaw = useSyncExternalStore(subscribeUser, getUserRaw, getServerUserRaw);
  const user = useMemo(() => parseUser(userRaw), [userRaw]);

  // Normaliza el hash (vacío, desconocido o id inexistente) a su forma canónica.
  useEffect(() => {
    const canonical = routeToHash(route);
    if (window.location.hash !== canonical) {
      history.replaceState(null, "", canonical);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  }, [route]);

  // Cada cambio de pantalla vuelve arriba.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [route]);

  const navigate: Navigate = useCallback((r) => {
    window.location.hash = routeToHash(r);
  }, []);

  const login = useCallback((u: User | null) => {
    try {
      if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
      else localStorage.removeItem(USER_KEY);
    } catch {}
    window.dispatchEvent(new Event(USER_EVENT));
  }, []);

  const signOut = useCallback(() => login(null), [login]);

  const saveScore = useCallback((entry: ScoreEntry) => {
    try {
      const all = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]");
      const list = Array.isArray(all) ? all : [];
      list.push({ ...entry, at: Date.now() });
      localStorage.setItem(SCORES_KEY, JSON.stringify(list));
    } catch {}
  }, []);

  let screen: ReactNode;
  switch (route.name) {
    case "detalle":
      screen = <GameDetail key={route.id} id={route.id} navigate={navigate} />;
      break;
    case "player":
      screen = <GamePlayer key={route.id} id={route.id} user={user} navigate={navigate} onSaveScore={saveScore} />;
      break;
    case "auth":
      screen = <Auth navigate={navigate} onLogin={login} />;
      break;
    case "salon":
      screen = <HallOfFame user={user} />;
      break;
    default:
      screen = <Library navigate={navigate} />;
  }

  return (
    <>
      <Nav route={route} user={user} onSignOut={signOut} />
      <main className="av-main">{screen}</main>
      <Footer />
    </>
  );
}

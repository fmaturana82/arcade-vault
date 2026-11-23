import { getGame } from "./data";

export type Route =
  | { name: "home" }
  | { name: "biblioteca" }
  | { name: "detalle"; id: string }
  | { name: "player"; id: string }
  | { name: "auth" }
  | { name: "salon" };

export function routeToHash(r: Route): string {
  switch (r.name) {
    case "home":
      return "#/";
    case "biblioteca":
      return "#/biblioteca";
    case "detalle":
      return `#/juegos/${r.id}`;
    case "player":
      return `#/juegos/${r.id}/jugar`;
    case "auth":
      return "#/acceso";
    case "salon":
      return "#/salon";
  }
}

/** Hash vacío, desconocido o id de juego inexistente → Home. */
export function hashToRoute(hash: string): Route {
  const path = hash.replace(/^#/, "").replace(/\/+$/, "") || "/";
  if (path === "/biblioteca") return { name: "biblioteca" };
  if (path === "/acceso") return { name: "auth" };
  if (path === "/salon") return { name: "salon" };

  const m = path.match(/^\/juegos\/([^/]+)(\/jugar)?$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    if (getGame(id)) return m[2] ? { name: "player", id } : { name: "detalle", id };
  }
  return { name: "home" };
}

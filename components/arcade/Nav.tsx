"use client";

import { useState } from "react";
import { routeToHash, type Route } from "@/lib/route";
import type { User } from "./ArcadeApp";

interface NavProps {
  route: Route;
  user: User | null;
  onSignOut: () => void;
}

type NavTarget = "home" | "biblioteca" | "salon" | "about" | "auth";

export default function Nav({ route, user, onSignOut }: NavProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Biblioteca sigue activa en Detalle y Reproductor (igual que la plantilla).
  const isActive = (name: NavTarget) =>
    route.name === name ||
    (name === "biblioteca" && (route.name === "detalle" || route.name === "player"));
  const cls = (name: NavTarget) => (isActive(name) ? "active" : undefined);
  const current = (name: NavTarget) => (isActive(name) ? ("page" as const) : undefined);

  const homeHref = routeToHash({ name: "home" });
  const libHref = routeToHash({ name: "biblioteca" });
  const salonHref = routeToHash({ name: "salon" });
  const aboutHref = routeToHash({ name: "about" });
  const authHref = routeToHash({ name: "auth" });

  return (
    <>
      <nav className="av-nav" aria-label="Principal">
        <a className="logo" href={homeHref} onClick={close} aria-label="Arcade Vault — Inicio">
          <div className="logo-mark" aria-hidden="true"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </a>
        <div className="links">
          <a className={cls("home")} aria-current={current("home")} href={homeHref}>
            Inicio
          </a>
          <a className={cls("biblioteca")} aria-current={current("biblioteca")} href={libHref}>
            Biblioteca
          </a>
          <a className={cls("salon")} aria-current={current("salon")} href={salonHref}>
            Salón de la Fama
          </a>
          <a className={cls("about")} aria-current={current("about")} href={aboutHref}>
            Acerca de
          </a>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin" aria-hidden="true"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button
            type="button"
            className="btn ghost auth-btn"
            onClick={onSignOut}
            title="Cerrar sesión"
          >
            {user.name} ▾
          </button>
        ) : (
          <a className="btn auth-btn" href={authHref}>
            Iniciar Sesión
          </a>
        )}
        <button
          type="button"
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
          aria-expanded={open}
          aria-controls="av-mobile-panel"
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
        aria-hidden="true"
      ></div>
      <aside
        id="av-mobile-panel"
        className={"av-mobile-panel" + (open ? " open" : "")}
        aria-label="Menú móvil"
        inert={!open}
      >
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <a className={cls("home")} aria-current={current("home")} href={homeHref} onClick={close}>
          Inicio
        </a>
        <a className={cls("biblioteca")} aria-current={current("biblioteca")} href={libHref} onClick={close}>
          Biblioteca
        </a>
        <a className={cls("salon")} aria-current={current("salon")} href={salonHref} onClick={close}>
          Salón de la Fama
        </a>
        <a className={cls("about")} aria-current={current("about")} href={aboutHref} onClick={close}>
          Acerca de
        </a>
        <a className={cls("auth")} aria-current={current("auth")} href={authHref} onClick={close}>
          {user ? "Cuenta" : "Iniciar Sesión"}
        </a>
        <div style={{ flex: 1 }}></div>
        <div className="pixel" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}>
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}

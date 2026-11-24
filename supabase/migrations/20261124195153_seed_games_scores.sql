-- SPEC 06 — Seed: los 9 juegos del catálogo y 12 puntuaciones mock por juego.
-- La #01 de cada juego vale exactamente games.best. user_id queda null.

insert into public.games (id, title, short, long, cat, cover, color, best, plays, sort_order) values
  ('bloque-buster', 'BLOQUE BUSTER', 'Rebota la pelota y destruye muros de neón.',
   'Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?',
   'ARCADE', 'cover-bricks', 'cyan', 28450, '12.4K', 1),
  ('caida', 'CAÍDA', 'Encaja las piezas antes de que el techo te aplaste.',
   'Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.',
   'PUZZLE', 'cover-tetro', 'magenta', 184220, '31.8K', 2),
  ('serpentina', 'SERPENTINA', 'Crece sin morder tu propia cola.',
   'Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.',
   'ARCADE', 'cover-snake', 'green', 7820, '9.1K', 3),
  ('gloton', 'GLOTÓN', 'Devora puntos y escapa de los fantasmas.',
   'Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.',
   'ARCADE', 'cover-glot', 'yellow', 96400, '27.2K', 4),
  ('invasores', 'INVASORES', 'Defiende el planeta de filas alienígenas.',
   'Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.',
   'SHOOTER', 'cover-invaders', 'green', 54190, '18.0K', 5),
  ('rocas', 'ROCAS', 'Pulveriza asteroides en gravedad cero.',
   'Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.',
   'SHOOTER', 'cover-rocas', 'yellow', 41200, '15.6K', 6),
  ('ranaria', 'RANARIA', 'Cruza la autopista de pixeles.',
   'Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.',
   'ARCADE', 'cover-rana', 'green', 18900, '6.4K', 7),
  ('duelo-pixel', 'DUELO PIXEL', 'Dos paletas. Una pelota. Reflejos máximos.',
   'El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.',
   'VERSUS', 'cover-duelo', 'cyan', 24, '4.2K', 8),
  ('meteoro', 'METEORO', 'Sobrevive a la lluvia de meteoros en el vacío.',
   'Pilotas una nave vectorial atrapada en un campo de meteoros que no deja de fragmentarse. Rota, acelera y dispara: cada impacto parte la roca en trozos más rápidos. Recoge el núcleo magenta para disparar en abanico.',
   'SHOOTER', 'cover-meteoro', 'cyan', 36500, '8.2K', 9);

with players (name) as (
  values ('PX_KAI'), ('NEONFOX'), ('Z3R0COOL'), ('M00NRYU'), ('VAULT_07'), ('GLITCHA'),
         ('ATARI_KID'), ('CYBER_LU'), ('MAGENTA88'), ('SCANLINE'), ('BIT_LORD'), ('ARKADYA'),
         ('DROID_X'), ('RGB_QUEEN'), ('PIXEL_DAD'), ('RETROVIRA'), ('VECTORX'), ('JOY_STK')
),
picks as (
  select g.id as game_id, g.best, p.name,
         row_number() over (partition by g.id order by random()) as rn
  from public.games g cross join players p
)
insert into public.scores (game_id, name, score, created_at)
select game_id,
       name,
       case when rn = 1 then best else floor(best * (0.30 + random() * 0.68))::integer end,
       now() - random() * interval '30 days'
from picks
where rn <= 12;

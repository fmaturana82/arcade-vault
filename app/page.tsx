import ArcadeApp from "@/components/arcade/ArcadeApp";
import { getGames } from "@/lib/games";
export default async function Home() {
  const games = await getGames();
  return <ArcadeApp games={games} />;
}

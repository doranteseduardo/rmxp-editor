/** Colored type badge chip */

const TYPE_COLORS: Record<string, string> = {
  NORMAL:   "#A8A878", FIRE:     "#F08030", WATER:    "#6890F0",
  ELECTRIC: "#F8D030", GRASS:    "#78C850", ICE:      "#98D8D8",
  FIGHTING: "#C03028", POISON:   "#A040A0", GROUND:   "#E0C068",
  FLYING:   "#A890F0", PSYCHIC:  "#F85888", BUG:      "#A8B820",
  ROCK:     "#B8A038", GHOST:    "#705898", DRAGON:   "#7038F8",
  DARK:     "#705848", STEEL:    "#B8B8D0", FAIRY:    "#EE99AC",
};

interface Props {
  typeId: string;
  small?: boolean;
}

export function TypeChip({ typeId, small }: Props) {
  const bg = TYPE_COLORS[typeId] ?? "#888";
  const size = small ? { fontSize: 9, padding: "1px 4px", borderRadius: 2 } : { fontSize: 11, padding: "2px 7px", borderRadius: 3 };
  return (
    <span style={{
      background: bg, color: "#fff",
      fontWeight: 700, letterSpacing: "0.03em",
      display: "inline-block",
      ...size,
    }}>
      {typeId}
    </span>
  );
}

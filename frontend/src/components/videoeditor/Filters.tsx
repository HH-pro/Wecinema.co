interface FiltersProps {
  setFilter: (filter: string) => void;
}

const Filters: React.FC<FiltersProps> = ({ setFilter }) => {
  const filters = [
    { name: "None", value: "none" },
    { name: "Grayscale", value: "grayscale(100%)" },
    { name: "Sepia", value: "sepia(100%)" },
    { name: "Blur", value: "blur(5px)" },
    { name: "Brightness", value: "brightness(1.5)" },
    { name: "Contrast", value: "contrast(150%)" }
  ];

  return (
    <select
      onChange={(e) => setFilter(e.target.value)}
      className="bg-gray-800 text-white p-2 rounded-lg border border-gray-600"
    >
      {filters.map((filter) => (
        <option key={filter.value} value={filter.value}>
          {filter.name}
        </option>
      ))}
    </select>
  );
};

export default Filters;

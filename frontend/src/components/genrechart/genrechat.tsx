import React from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ChartProps {
    genres: { genre: string; rating: number }[];
    themes: { theme: string; rating: number }[];
}

const CombinedChart: React.FC<ChartProps> = ({ genres, themes }) => {
    // Prepare the data for the chart
    const genreLabels = genres.map((g) => g.genre);
    const themeLabels = themes.map((t) => t.theme);
    const genreRatings = genres.map((g) => g.rating);
    const themeRatings = themes.map((t) => t.rating);

    const data = {
        labels: [...genreLabels, ...themeLabels],
        datasets: [
            {
                label: "Genre Ratings",
                data: genreRatings,
                backgroundColor: "rgba(255, 99, 132, 0.5)",
            },
            {
                label: "Theme Ratings",
                data: themeRatings,
                backgroundColor: "rgba(54, 162, 235, 0.5)",
            },
        ],
    };

    return (
        <div>
            <h2>Combined Genre and Theme Ratings</h2>
            <Bar
                data={data}
                options={{
                    responsive: true,
                    plugins: {
                        legend: {
                            position: "top" as const,
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.dataset.label || "";
                                    return `${label}: ${context.raw}`;
                                },
                            },
                        },
                    },
                    scales: {
                        x: {
                            stacked: true,
                        },
                        y: {
                            stacked: true,
                        },
                    },
                }}
            />
        </div>
    );
};

export default CombinedChart;

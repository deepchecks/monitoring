import { ChartData, ChartOptions } from 'chart.js';

export function getData(data: number[]): ChartData<'doughnut', number[], string> {
  return {
    datasets: [
      {
        data,
        backgroundColor: ['rgb(252, 99, 107)', 'rgb(55, 168, 98)', 'rgb(139, 154, 166)'],
        hoverBackgroundColor: ['rgba(252, 99, 107, 0.8)', 'rgba(55, 168, 98, 0.8)', 'rgb(178, 188, 196)'],
        borderWidth: 0.5
      }
    ]
  };
}

export const options: (allScores: number) => ChartOptions<'doughnut'> = allScores => ({
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      displayColors: false,
      callbacks: {
        label: tooltipItem => {
          const value = tooltipItem.raw || 0;
          const percentage = `${Math.round((Number(value) / Number(allScores)) * 100)}%`;

          return `${percentage} (${value})`;
        },
        labelTextColor: tooltipItem =>
          tooltipItem.dataset.backgroundColor
            ? tooltipItem.dataset.backgroundColor[
                tooltipItem.dataIndex as keyof typeof tooltipItem.dataset.backgroundColor
              ]
            : ''
      },
      bodyFont: {
        size: 16,
        weight: '700',
        family: 'Manrope'
      },
      padding: 12
    }
  },
  cutout: '85%',
  responsive: true
});

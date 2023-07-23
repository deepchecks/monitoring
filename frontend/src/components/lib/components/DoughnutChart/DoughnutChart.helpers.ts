import { ChartData, ChartOptions } from 'chart.js';

// todo dynamically generate the colors
export function getData(data: number[]): ChartData<'doughnut', number[], string> {
  return {
    datasets: [
      {
        data,
        backgroundColor: ['rgb(252, 99, 107)', 'rgb(55, 168, 98)', 'rgb(70, 77, 90)'],
        hoverBackgroundColor: ['rgba(252, 99, 107, 0.8)', 'rgba(55, 168, 98, 0.8)', 'rgba(70, 77, 90, 0.8)'],
        borderWidth: 1
      }
    ]
  };
}

export const options: ChartOptions<'doughnut'> = {
  plugins: {
    legend: {
      display: false
    }
  },
  cutout: '70%',
  responsive: true
};

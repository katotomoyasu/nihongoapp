<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps<{ labels: string[]; values: number[] }>()

const chartData = {
  labels: props.labels,
  datasets: [
    {
      label: '正答率(%)',
      backgroundColor: '#42a5f5',
      data: props.values,
    },
  ],
}

const chartOptions = {
  responsive: true,
  scales: {
    y: { beginAtZero: true, max: 100 },
  },
}
</script>

<template>
  <Bar :data="chartData" :options="chartOptions" />
</template>

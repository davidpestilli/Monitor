import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


export default defineConfig({
  base: "/Monitor/", // Nome do repositório
  plugins: [react()],
});


import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.js',
    include: ['tests/unit/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      // `skipFull: false` hace que la tabla de texto muestre tambien los
      // archivos al 100 %, que por defecto se omiten (y era justo el archivo
      // con la mejor cobertura). `json-summary` deja un resumen legible por
      // maquina para adjuntarlo como evidencia.
      reporter: [['text', { skipFull: false }], 'html', 'json-summary'],
      reportsDirectory: './tests/coverage',   
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',                      
        'src/assets/**',
        'src/App.css',
        'src/components/BookingForm.jsx',    
      ],
    },
  },
})
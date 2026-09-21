import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Services from './components/Servicios'
import BookingPage from './pages/BookingPage'

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="bg-neutral-950 min-h-screen">
            <Navbar />
            <Hero />
            <Services />
          </div>
        }
      />
      <Route path="/agendar" element={<BookingPage />} />
    </Routes>
  )
}

export default App
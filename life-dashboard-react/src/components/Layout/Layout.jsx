import React from 'react'
import Header from './Header'
import Nav from './Nav'
import RatingModal from '../modals/RatingModal'
import useAppStore from '../../store/appStore'

function Layout({ children }) {
  const ratingModalOpen      = useAppStore((s) => s.ratingModalOpen)
  const pendingRatingCallback = useAppStore((s) => s.pendingRatingCallback)
  const closeRatingModal     = useAppStore((s) => s.closeRatingModal)

  return (
    <div className="app-layout">
      <Header />
      <Nav />
      <main className="app-main">
        {children}
      </main>
      <RatingModal
        open={ratingModalOpen}
        onClose={closeRatingModal}
        onSave={(energy, focus) => {
          pendingRatingCallback?.({ energy, focus })
          closeRatingModal()
        }}
      />
    </div>
  )
}

export default Layout

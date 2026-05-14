import React from 'react'
import Header from './Header'
import Nav from './Nav'

function Layout({ children }) {
  return (
    <div className="app-layout">
      <Header />
      <Nav />
      <main className="app-main">
        {children}
      </main>
    </div>
  )
}

export default Layout

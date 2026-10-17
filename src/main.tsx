import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { installButtonFx } from './buttonFx'
import { installMotion } from './motion'

installButtonFx()
installMotion()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

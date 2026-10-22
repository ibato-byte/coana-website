import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
// Signal Sky（2026-10 リニューアル）の見た目。index.css・solution.css の後に読み込む
import './signal.css'
import { installButtonFx } from './buttonFx'
import { installMotion } from './motion'

installButtonFx()
installMotion()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

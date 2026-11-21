import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
// Signal Sky（2026-10 リニューアル）の見た目。index.css の後に読み込む
import './signal.css'
import './hp-calm.css'
// サービスLP（2026-11-22 に作り直し）と、ホームページの「絵で見せる」層。上の層のあとに読み込む
import './lpx.css'
import './hp-visual.css'
import { installButtonFx } from './buttonFx'
import { installMotion } from './motion'

installButtonFx()
installMotion()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

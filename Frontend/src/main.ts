import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

// 예: main.ts 또는 App.svelte
import { currentRoom } from './common/store/pageStore';
import { get } from 'svelte/store';

(window as any).currentRoom = currentRoom;
(window as any).get = get;


const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app

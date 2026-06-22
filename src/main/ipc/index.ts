import { registerProviderIpc } from './provider';
import { registerHealthIpc } from './health';
import { registerTestProviderIpc } from './testProvider';
import { registerSystemIpc } from './system';

export function registerAllIpc() {
  registerProviderIpc();
  registerHealthIpc();
  registerTestProviderIpc();
  registerSystemIpc();
}

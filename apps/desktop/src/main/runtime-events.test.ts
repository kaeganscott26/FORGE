import { describe, expect, it } from 'vitest';
import { IPC_CHANNELS } from '@forge/ipc';
import { eventForChannel } from './runtime-events';

describe('runtime event invalidation', () => {
  it('does not persist high-frequency terminal input or read-only queries', () => {
    expect(eventForChannel(IPC_CHANNELS.terminalInput)).toBeNull();
    expect(eventForChannel(IPC_CHANNELS.terminalResize)).toBeNull();
    expect(eventForChannel(IPC_CHANNELS.terminalList)).toBeNull();
    expect(eventForChannel(IPC_CHANNELS.tasksList)).toBeNull();
    expect(eventForChannel(IPC_CHANNELS.agentMemoriesList)).toBeNull();
    expect(eventForChannel(IPC_CHANNELS.agentMemoriesStats)).toBeNull();
  });

  it('still invalidates context for durable mutations', () => {
    expect(eventForChannel(IPC_CHANNELS.terminalCreate)).toBe('terminal.changed');
    expect(eventForChannel(IPC_CHANNELS.tasksUpdate)).toBe('task.changed');
    expect(eventForChannel(IPC_CHANNELS.agentMemoriesDelete)).toBe('memory.changed');
    expect(eventForChannel(IPC_CHANNELS.fileWrite)).toBe('file.changed');
  });
});

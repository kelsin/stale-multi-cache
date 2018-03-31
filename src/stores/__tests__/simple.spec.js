// @flow
//region typing, stripped during compiling
import type { describe, test, expect } from '@types/jest';
//endregion

import { SimpleMemoryStore } from 'src/stores/simple';
import { NotFoundError } from 'src/errors/notFound';

describe('SimpleMemoryStore', () => {
  
  const store = SimpleMemoryStore.build();
  
  describe('#getClassName()', () => {
    test('should return class name', () => {
      expect(store.getClassName()).toEqual('SimpleMemoryStore');
    });
  });
  
  describe(`#set()`, () => {
    test('should return a resolved promise for a set value', async () => {
      await expect(store.set('test', 'value')).resolves.toBeDefined();
    });
  });
  describe(`#get()`, () => {
    test('should return a resolved promise', async () => {
      await expect(store.set('test', 'value')).resolves.toBeDefined();
      await expect(store.get('test')).resolves.toEqual('value');
    });
    
    test('should return a rejected promise for an unknown value', async () => {
      await expect(store.get('unknown')).rejects.toBeInstanceOf(NotFoundError);
      await expect(store.get('unknown')).rejects.toEqual(NotFoundError.build('unknown'));
    });
  });
});




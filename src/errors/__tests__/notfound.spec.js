// @flow
//region typing, stripped during compiling
import type { describe, test, expect } from '@types/jest';
//endregion

import { NotFoundError } from 'src/errors/notFound';

describe('NotFoundError', () => {
  test('should be an error', () => {
    const error = new NotFoundError('key');
    expect(error).toBeInstanceOf(Error);
  });
  
  test('should save the key used', () => {
    const error = new NotFoundError('key');
    expect(error.key).toEqual('key');
  });
});
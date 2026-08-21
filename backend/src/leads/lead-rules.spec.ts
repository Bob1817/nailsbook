import { BadRequestException } from '@nestjs/common';
import { assertLeadTransition } from './lead-rules';

describe('lead state machine', () => {
  it.each([
    ['new', 'following_up'],
    ['following_up', 'paused'],
    ['paused', 'following_up'],
    ['following_up', 'won'],
    ['lost', 'following_up'],
  ])('allows %s -> %s', (from, to) =>
    expect(() => assertLeadTransition(from, to)).not.toThrow(),
  );
  it('requires a lost reason', () =>
    expect(() => assertLeadTransition('following_up', 'lost')).toThrow(
      BadRequestException,
    ));
  it('accepts a standard lost reason', () =>
    expect(() =>
      assertLeadTransition('following_up', 'lost', 'price'),
    ).not.toThrow());
  it('rejects reopening won leads', () =>
    expect(() => assertLeadTransition('won', 'following_up')).toThrow(
      BadRequestException,
    ));
});

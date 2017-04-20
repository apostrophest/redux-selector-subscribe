import expect from 'expect';
import { collectSubscribers } from '../src/';

/**
 * Returns a test helper for a Redux store `getState` method that always
 * returns a new value on each call.
 * 
 * Returns the series of natural numbers starting at 1 on the first call
 * and counting up by 1 on subsequent calls.
 * 
 * @returns {expect.Spy<number>}
 */
function getChangingState() {
  let state = 0;
  const changingState = () => {
    state += 1;
    return state;
  }
  return expect.createSpy().andCall(changingState);
}

/**
 * Returns a selector subscriber whose functions are all no-ops.
 * 
 * This is mostly used as a stand-in for a selector subscriber when the
 * subscriber is not the important unit under test in a given test.
 * 
 * @returns {{selector: Function, onChange: Function}}
 */
function noopSelectorSubscriber() {
  return {
    selector: () => {},
    onChange: () => {}
  };
}

/**
 * Returns a fake Redux store that will call its listeners exactly one time.
 * 
 * By defining a stand-in for the Redux store `subscribe` method which immediately
 * invokes its supplied subscriber, the returned object acts like a Redux store
 * that invokes all of its subscribed listeners exactly once.
 * 
 * @param {Function} getState A function suitable to act as a Redux store's `getState` method
 * @returns {{getState: Function, subscribe: Function}}
 */
function getStoreThatChangesOnce(getState) {
  return {
    getState,
    subscribe: callback => callback()
  }
}

describe('collectSubscribers', () => {
  it('throws if no selector subscribers are provided', () => {
    expect(() => {
      collectSubscribers()();
    }).toThrow('No selector subscribers provided.');
  });

  it('throws if a selector subscriber does not specify any parts of the contract', () => {
    const store = {
      getState: () => {},
      subscribe: () => {}
    };
    const failsContract = {};
    
    expect(() => {
      collectSubscribers(failsContract)(store);
    }).toThrow('Subscription (index 0) does not have a selector function defined.');
  });

  it('throws if a selector subscriber has an onChange but not selector', () => {
    const store = {
      getState: () => {},
      subscribe: () => {}
    };
    const missingSelector = {
      onChange: () => {}
    };
    
    expect(() => {
      collectSubscribers(missingSelector)(store);
    }).toThrow('Subscription (index 0) does not have a selector function defined.');
  });

  it('throws if a selector subscriber has a selector but no onChange', () => {
    const store = {
      getState: () => {},
      subscribe: () => {}
    };
    const missingSelector = {
      selector: () => {}
    };
    
    expect(() => {
      collectSubscribers(missingSelector)(store);
    }).toThrow('Subscription (index 0) does not have an onChange function defined.');
  });

  it('throws if store is not supplied', () => {
    const selectorSubscriber = noopSelectorSubscriber();
    
    expect(() => {
      collectSubscribers(selectorSubscriber)();
    }).toThrow('Store was not supplied to the function returned from collectSubscribers.');
  });

  it('throws if store does not have getState nor subscribe', () => {
    const store = {};
    const selectorSubscriber = noopSelectorSubscriber();
    
    expect(() => {
      collectSubscribers(selectorSubscriber)(store);
    }).toThrow('Supplied store does not implement the Redux store interface.');
  });

  it('throws if store has getState but not subscribe', () => {
    const store = {
      getState: () => {}
    };
    const selectorSubscriber = noopSelectorSubscriber();
    
    expect(() => {
      collectSubscribers(selectorSubscriber)(store);
    }).toThrow('Supplied store does not implement the Redux store interface.');
  });

  it('throws if store has subscribe but not getState', () => {
    const store = {
      subscribe: () => {}
    };
    const selectorSubscriber = noopSelectorSubscriber();
    
    expect(() => {
      collectSubscribers(selectorSubscriber)(store);
    }).toThrow('Supplied store does not implement the Redux store interface.');
  });

  it('does nothing if not initialized with a store', () => {
    const selectorSubscriber = {
      selector: expect.createSpy(),
      onChange: expect.createSpy()
    };

    expect(() => collectSubscribers(selectorSubscriber)).toNotThrow();
    expect(selectorSubscriber.selector).toNotHaveBeenCalled();
    expect(selectorSubscriber.onChange).toNotHaveBeenCalled();
  });

  it('loads the initial state of the store', () => {
    const store = {
      getState: expect.createSpy(),
      subscribe: () => {}
    };
    const selectorSubscriber = noopSelectorSubscriber();
    
    collectSubscribers(selectorSubscriber)(store);

    expect(store.getState).toHaveBeenCalled('store getState should get called to get initial state');
    expect(store.getState.calls.length).toEqual(1, 'store getState should get called only once');
  });

  it('gets the initial value of a selector', () => {
    const getState = expect.createSpy().andReturn(5);
    const store = {
      getState,
      subscribe: () => {}
    };
    const selectorSubscriber = {
      selector: expect.createSpy(),
      onChange: () => {}
    };
    
    collectSubscribers(selectorSubscriber)(store);

    expect(selectorSubscriber.selector).toHaveBeenCalled('selector should be called to get initial value');
    expect(selectorSubscriber.selector.calls.length).toEqual(1, 'selector should be called only once to get initial value');
    expect(selectorSubscriber.selector.calls[0].arguments[0]).toEqual(5, 'selector should be called with redux state');
  });

  it('does not call onChange if state changes but selector value does not change', () => {
    const getState = getChangingState();
    const store = getStoreThatChangesOnce(getState);
    const selectorSubscriber = {
      selector: expect.createSpy().andReturn('test value'),
      onChange: expect.createSpy()
    };
    
    collectSubscribers(selectorSubscriber)(store);

    expect(selectorSubscriber.selector).toHaveBeenCalled('selector should be called to get initial value and changed value');
    expect(selectorSubscriber.selector.calls.length).toEqual(2, 'selector should be called to get initial value and changed value');
    expect(selectorSubscriber.selector.calls[0].arguments[0]).toEqual(1, 'selector should be called with initial state first');
    expect(selectorSubscriber.selector.calls[1].arguments[0]).toEqual(2, 'selector should be called with updated state second');
    expect(selectorSubscriber.onChange).toNotHaveBeenCalled('onChange should not be called when the selector returns a constant value');
  });

  it('calls onChange with new value if state changes and selector value changes', () => {
    const getState = getChangingState();
    const store = getStoreThatChangesOnce(getState);
    const selectorSubscriber = {
      selector: x => x * 2,
      onChange: expect.createSpy()
    };
    
    collectSubscribers(selectorSubscriber)(store);

    expect(selectorSubscriber.onChange).toHaveBeenCalled('onChange should be called when the selector returns a different value');
    expect(selectorSubscriber.onChange.calls.length).toEqual(1, 'onChange should be called only once when selector changes');
    expect(selectorSubscriber.onChange.calls[0].arguments[0]).toEqual(4, 'onChange should be called with the new value as first positional argument');
    expect(selectorSubscriber.onChange.calls[0].arguments[1]).toEqual(2, 'onChange should be called with the old value as second positional argument');
  });

  it('subscribing the same thing twice will cause its onChange to be called twice', () => {
    const getState = getChangingState();
    const store = getStoreThatChangesOnce(getState);
    const changingSelectorSubscriber = {
      selector: x => x * 2,
      onChange: expect.createSpy()
    };
    
    collectSubscribers(changingSelectorSubscriber, changingSelectorSubscriber)(store);

    expect(changingSelectorSubscriber.onChange.calls.length).toEqual(2, 'onChange should be called twice if subscriber subscribed twice');
  });

  it('can handle one hundred subscriptions changing over each of one hundred state changes', () => {
    const getState = getChangingState();

    // get a handle on the store subscribe callback so that we can manually invoke a state change response
    let exfiltratedCallback;
    const store = {
      getState,
      subscribe: (callback) => { exfiltratedCallback = callback; }
    };

    // use the same onChange spy for all subscribers to aggregate all calls on one spy
    const onChange = expect.createSpy();
    const subscribers = [];
    for (let i = 1; i <= 100; i++) {
      subscribers.push({
        selector: x => x * i,
        onChange
      });
    }
    
    collectSubscribers(...subscribers)(store);

    // run 100 state changes
    for (let i = 0; i < 100; i++) {
      exfiltratedCallback();
    }

    expect(onChange.calls.length).toEqual(10000, 'onChange should have been called for all subscriptions and state changes');
  });
});

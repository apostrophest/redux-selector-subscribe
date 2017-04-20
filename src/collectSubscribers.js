
/**
 * @param {Function[]} subscriptions 
 */
function validateSubscriptions(subscriptions) {
    if (!subscriptions || !subscriptions.length) {
        throw new Error(`No selector subscribers provided.`);
    }
}

/**
 * @param {{getState: Function, subscribe: Function}} store 
 */
function validateStore(store) {
    if (!store) {
        throw new Error(`Store was not supplied to the function returned from collectSubscribers.`);
    }

    if (typeof store.getState !== 'function' || typeof store.subscribe !== 'function') {
        throw new Error(`Supplied store does not implement the Redux store interface.`);
    }
}

/**
 * @param {{selector: Function, onChange: Function}} selectorSubscriber 
 * @param {number} index 
 */
function validateSelectorSubscriber(selectorSubscriber, index) {
    if (!selectorSubscriber.selector || typeof selectorSubscriber.selector !== 'function') {
        throw new Error(`Subscription (index ${index}) does not have a selector function defined.`);
    }

    if (!selectorSubscriber.onChange || typeof selectorSubscriber.onChange !== 'function') {
        throw new Error(`Subscription (index ${index}) does not have an onChange function defined.`);
    }
}

/**
 * @param {Function[]} subscriptions
 * @return {Function}
 */
const collectSubscribers = (...subscriptions) => (store) => {
    validateSubscriptions(subscriptions);
    validateStore(store);

    const initialState = store.getState();
    const values = new Array(subscriptions.length);
    
    for (let i = 0; i < subscriptions.length; i++) {
        validateSelectorSubscriber(subscriptions[i], i);
        values[i] = subscriptions[i].selector(initialState);
    }

    store.subscribe(() => {
        const state = store.getState();
        for (let i = 0; i < subscriptions.length; i++) {
            const newValue = subscriptions[i].selector(state);
            if (newValue !== values[i]) {
                subscriptions[i].onChange(newValue, values[i]);
                values[i] = newValue;
            }
        }
    });
}

export default collectSubscribers;

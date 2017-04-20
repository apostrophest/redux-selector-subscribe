import { Store } from 'redux';

export interface SelectorSubscriber<S, V> {
    selector: (state: S) => V,
    onChange: (newValue: V, oldValue?: V) => void
};

type ReduxSubscriber<S> = (store: Store<S>) => void;

export function collectSubscribers<S>(...subscriptions: SelectorSubscriber<S, any>[]): ReduxSubscriber<S>;

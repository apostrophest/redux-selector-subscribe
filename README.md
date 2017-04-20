# redux-selector-subscribe

### Why?
On NPR.org, we've gradually built out a Redux app within an existing multi-page web site. We've found that there are still use cases for notifying your non-Redux code about an update to Redux state.

Using middleware accomplishes the task, but there are some downsides:
- a new middleware executing on every action
- middleware has access to all of state via `getState`, not just a specific value
- middleware also has access to `dispatch`, which is not always necessary

Subscribing to Redux store updates via selectors has several advantages:
- easy integration with performance-enhancing selector patterns like memoization or `reselect`
- tightly scoped access to Redux state
- your app code has no other handles into Redux infrastructure

### Concept
A "selector subscriber" needs a reference to a Redux selector and a change handler function. Once bound to the Redux store, the change handler will be called on every change to the selector's return value. The change handler can make use of the new value as well as the previous value of the selector.

###### selector
The `selector` property must be a function that takes Redux state as its single parameter.

###### onChange
The `onChange` property must be a function that takes one or two arguments. The first argument will be the updated value from state while the second argument will be the previous value.

### Examples

##### Body classes and embedded Redux apps
You might have a Redux app mounted somewhere relatively low in the DOM. You also might have existing style sheets that rely upon a class set high up in the DOM. For example, you might want to change the appearance of a global nav bar when your app is in a particular state. However, your global nav bar is not part of your Redux app yet.

```javascript
import $ from 'jquery';

import { isAppLoading } from './app/reducer';

export default const loadingSubscriber = {
  selector: isAppLoading,
  onChange: isLoading => $('#global-navigation').toggleClass('app-loading', isLoading)
};
```

##### Metrics and analytics
You might have a Redux app with its own implementation of metrics and analytics. There are plenty of tools and libraries to help you integrate these concerns into your Redux app, but you might be embedding your Redux app onto a page that measures related concerns.

```javascript
import ActivityTypes from './app/constants/ActivityTypes';
import { getActivityCounts } from './app/reducer';

export default const clickActivitySubscriber = {
  selector: state => getActivityCounts(state, ActivityTypes.CLICK),
  onChange: (newCount, oldCount) => {
    const detail = { by: newCount - oldCount }
    const event = new CustomEvent('app:analytics:incrementClicks', { detail });
    document.dispatchEvent(event);
  }
};
```

### Collecting selector subscribers
```javascript
// app/subscribeToStore.js
import { collectSubscribers } from 'redux-selector-subscribe';

import loadingSubscriber from './app/subscribers/loadingSubscriber';
import clickActivitySubscriber from './app/subscribers/clickActivitySubscriber';

export default collectSubscribers(
  loadingSubscriber,
  clickActivitySubscriber
);
```

```javascript
// app/store.js
import { createStore } from 'redux';

import rootReducer from './reducer';
import subscribeToStore from './app/subscribeToStore';

export default function configureStore(initialState) {
  const store =  createStore(rootReducer, initialState);
  subscribeToStore(store);
  return store;
};
```

### License
MIT

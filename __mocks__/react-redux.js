const React = require('react');

const ReduxProvider = ({ children }) => children;

module.exports = {
    Provider: ReduxProvider,

    useDispatch: () => jest.fn(),

    useSelector: (selector) => {
        if (typeof selector === 'function') {
            return selector({});
        }
        return undefined;
    },

    useStore: () => ({
        getState: jest.fn(() => ({})),
        dispatch: jest.fn(),
        subscribe: jest.fn(),
    }),
};
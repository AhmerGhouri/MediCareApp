const React = require('react');
const { View } = require('react-native');

const LinearGradient = React.forwardRef((props, ref) =>
    React.createElement(
        View,
        {
            ...props,
            ref,
            testID: props.testID || 'linear-gradient',
        },
        props.children
    )
);

module.exports = LinearGradient;
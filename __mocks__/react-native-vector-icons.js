const React = require('react');
const { View } = require('react-native');

const createIconMock = () => {
    return React.forwardRef((props, ref) =>
        React.createElement(View, {
            ...props,
            ref,
            testID: props.testID || 'mock-icon',
        })
    );
};

module.exports = {
    AntDesign: createIconMock(),
    Fontisto: createIconMock(),
    MaterialIcons: createIconMock(),
    Ionicons: createIconMock(),
    Feather: createIconMock(),
    FontAwesome: createIconMock(),
    createIconSet: createIconMock,
};
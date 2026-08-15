module.exports = {
    convert: jest.fn(() =>
        Promise.resolve({
            filePath: '/tmp/test.pdf',
        })
    ),
};
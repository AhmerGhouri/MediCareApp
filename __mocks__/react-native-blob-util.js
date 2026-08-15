module.exports = {
    fs: {
        dirs: {
            CacheDir: '/tmp',
            DocumentDir: '/tmp',
        },
        writeFile: jest.fn(),
        readFile: jest.fn(),
        unlink: jest.fn(),
        exists: jest.fn(),
    },

    config: jest.fn(() => ({
        fetch: jest.fn(),
    })),

    fetch: jest.fn(),

    session: jest.fn(() => ({
        dispose: jest.fn(),
    })),
};
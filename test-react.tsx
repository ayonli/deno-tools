// TypeScript React test file (.tsx)
import React from 'react';

let unused = 'this should trigger linting in tsx';
let shouldBeConst = 'another tsx issue';

export function TestComponent(props: any) {
    console.log(shouldBeConst);
    return <div>Test</div>;
}

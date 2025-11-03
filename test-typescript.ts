// TypeScript test file (.ts)
let unused = 'this should trigger linting';
let shouldBeConst = 'another issue';
console.log(shouldBeConst);

function testFunction(param: any) {
    return param;
}

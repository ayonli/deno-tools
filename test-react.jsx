// JavaScript React test file (.jsx)
let unusedJsx = 'this should trigger linting in jsx';
let shouldBeConstJsx = 'another jsx issue';

export function TestJsxComponent(props) {
    console.log(shouldBeConstJsx);
    return <div>Test JSX</div>;
}

import DrawingSpace from './DrawingSpace.jsx';
import CommandBar from './CommandBar.jsx';

export default function App() {
  return (
    <>
      <main className="views" aria-label="Alpha workspace">
        <DrawingSpace />
        <section className="second-view" aria-label="Empty second view" />
      </main>
      <CommandBar />
    </>
  );
}

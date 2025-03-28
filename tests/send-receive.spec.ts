import { expect, test } from '../playwright.fixtures.js';

// - [ ] follows tab index in both directions
// - [ ] scrolls to to a specific position
// - [ ] writes characters with modifiers

test('reflects mouse position', async ({ setupPages }) => {
  const { sender, receiver } = await setupPages('/test');

  // move the mouse cursor (to be mirrored)
  await sender.bringToFront();
  await sender.mouse.move(200, 300, { steps: 10 });

  // check the receiver
  await receiver.bringToFront();
  const cursor = receiver.getByLabel('cursor', { exact: true });
  await expect(cursor, 'No visualized cursor found').toBeInViewport();
  expect(await cursor.boundingBox(), 'Cursor position not matching').toStrictEqual({
    x: 188,
    y: 288,
    width: 24,
    height: 24,
  });
});

test('reflects text inputs', async ({ setupPages }) => {
  const { sender, receiver } = await setupPages('/test');
  await sender.bringToFront();

  // focus element with a simulated mouse click (to be mirrored)
  await sender.getByRole('textbox').first().click({ delay: 100 });
  // wait for the focus events to be processed
  await sender.waitForTimeout(200);

  // now type into the focused element using the keyboard (to be mirrored)
  await sender.keyboard.press('Shift+T', { delay: 100 });
  await sender.keyboard.press('e', { delay: 100 });
  await sender.keyboard.press('s', { delay: 100 });
  await sender.keyboard.press('t', { delay: 100 });

  // check the receiver
  await receiver.bringToFront();
  await expect(receiver.getByRole('textbox').first()).toHaveValue('Test');
});

test('checks checkboxes on click', async ({ setupPages }) => {
  const { sender, receiver } = await setupPages('/test');
  await sender.bringToFront();

  // click checkbox with a simulated mouse click (to be mirrored)
  await sender.getByRole('checkbox').click({ delay: 100 });
  // wait for the focus events to be processed
  await sender.waitForTimeout(200);

  // check the receiver
  await receiver.bringToFront();
  await expect(receiver.getByRole('checkbox')).toBeChecked();
});

test('double click selects single word', async ({ setupPages }) => {
  const { sender, receiver } = await setupPages('/test');
  await sender.bringToFront();

  // click headline twice with a simulated mouse click (to be mirrored)
  await sender.getByRole('heading').click({ clickCount: 2, delay: 20 });
  // wait for the click events to be processed
  await sender.waitForTimeout(200);

  // check the receiver
  await receiver.bringToFront();
  const selection = await receiver.evaluate(() => document.getSelection()?.toString());
  expect(selection).toBe('World');
});

test('triple click selects whole text', async ({ setupPages }) => {
  const { sender, receiver } = await setupPages('/test');
  await sender.bringToFront();

  // click headline thrice with a simulated mouse click (to be mirrored)
  await sender.getByRole('heading').click({ clickCount: 3, delay: 20 });
  // wait for the click events to be processed
  await sender.waitForTimeout(200);

  // check the receiver
  await receiver.bringToFront();
  const selection = await receiver.evaluate(() => document.getSelection()?.toString());
  expect(selection).toBe('Hello World!\n');
});

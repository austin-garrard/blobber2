import { filter, map, share, tap } from 'rxjs/operators'
import { merge } from 'rxjs/observable/merge'
import { KeyCombo } from './keys'
import { unless } from '../../../shared/operators'
import { Observable } from 'rxjs/Observable'
import { Subscription } from 'rxjs'

/**
 *
 * Represents the currently held-down keys of the given keys. The stream will
 * emit an event containing the current KeyCombo whenever it changes.
 *
 * The KeyComboStream can be 'locked' by the given lock stream, which
 * emits true or false values, and emits its current value upon subscription.
 *
 * When the latest emission from the lock stream is true, the KeyComboStream
 * will be locked and no events will be emitted. When the latest emission from
 * the lock stream is false, the KeyComboStream will emit events.
 *
 * @param {Array<number>} keys - The key codes to listen for
 * @param {Observable} blur$ - window blur event stream
 * @param {Observable} keyDown$ - window keydown event stream
 * @param {Observable} keyUp$ - window keyup event stream
 * @param {Observable<boolean>} isDisabled$ - true/false stream that disables event emission when true
 * @returns {Observable<KeyCombo>} Emits the current KeyCombo
 */
export function KeyComboStream (keys, blur$, keyDown$, keyUp$, isDisabled$) {
  return new Observable(observer => {
    let currentKeyCombo = KeyCombo()
    const subscription = new Subscription()

    // Remove any keys in the combo when the user alt-tabs
    subscription.add(blur$.subscribe(event => {
      currentKeyCombo = currentKeyCombo.clear()
    }))

    // Set up stream for keydown events

    const addKeyIfRelevant = source$ => source$.pipe(
      filter(event => keys.includes(event.keyCode)),
      map(event => currentKeyCombo.add(event.keyCode)),
      filter(newKeyCombo => !newKeyCombo.equals(currentKeyCombo))
    )

    const _keyDown$ = keyDown$.pipe(
      addKeyIfRelevant,
      share())

    subscription.add(_keyDown$.subscribe(newKeyCombo => {
      currentKeyCombo = newKeyCombo
    }))

    // Set up stream for keyup events

    const removeKeyIfRelevant = source$ => source$.pipe(
      filter(event => keys.includes(event.keyCode)),
      map(event => currentKeyCombo.remove(event.keyCode)),
      tap(newKeyCombo => { currentKeyCombo = newKeyCombo }))

    const _keyUp$ = keyUp$.pipe(
      removeKeyIfRelevant,
      share())

    subscription.add(_keyUp$.subscribe(newKeyCombo => {
      currentKeyCombo = newKeyCombo
    }))

    // Cross the streams D:

    const keyComboStream = merge(_keyDown$, _keyUp$).pipe(unless(isDisabled$))
    subscription.add(keyComboStream.subscribe(observer))

    return subscription
  })
}

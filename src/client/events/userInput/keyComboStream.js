import { filter, map, share, tap } from 'rxjs/operators'
import { LockedSubject } from '../../../shared/subjects'
import { merge } from 'rxjs/observable/merge'
import { KeyCombo } from './keys'
import { unless } from '../../../shared/operators'
import { Observable } from 'rxjs/observable'
import { Subscription } from 'rxjs'

/**
 *
 * Represents the currently held-down keys of the given keys. The stream will
 * emit an event containing the current KeyCombo whenever it changes.
 *
 * The KeyComboStream can be 'locked' by the given lock streams, which
 * emit true or false values. When the latest emission from any of the
 * lock streams is true, the KeyComboStream will be locked and no events
 * will be emitted. Once the latest emission from all of the lock streams
 * is false again, the KeyComboStream will resume emitting events.
 *
 * @param {Array<number>} keys - The key codes to listen for
 * @param {Observable} blur$ - window blur event stream
 * @param {Observable} keyDown$ - window keydown event stream
 * @param {Observable} keyUp$ - window keyup event stream
 * @param {Array<Observable>} locks - true/false streams that can lock this stream
 * @returns Observable
 */
export function KeyComboStream (keys, blur$, keyDown$, keyUp$, locks) {
  return new Observable(observer => {
    let currentKeyCombo = KeyCombo()
    const subscription = new Subscription()

    // Remove any keys in the combo when the user alt-tabs
    subscription.add(blur$.subscribe(event => {
      currentKeyCombo = currentKeyCombo.clear()
    }))

    //
    // Set up stream for keydown events
    //

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

    //
    // Set up stream for keyup events
    //

    const removeKeyIfRelevant = source$ => source$.pipe(
      filter(event => keys.includes(event.keyCode)),
      map(event => currentKeyCombo.remove(event.keyCode)),
      tap(newKeyCombo => { currentKeyCombo = newKeyCombo })
    )

    const _keyUp$ = keyUp$.pipe(
      removeKeyIfRelevant,
      share())

    subscription.add(_keyUp$.subscribe(newKeyCombo => {
      currentKeyCombo = newKeyCombo
    }))

    //
    // Set up stream for locking event emission
    //

    const isLocked$ = LockedSubject()
    locks.forEach(lock => subscription.add(lock.subscribe(isLocked$.observer())))

    //
    // Cross the streams D:
    //

    subscription.add(merge(_keyDown$, _keyUp$).pipe(unless(isLocked$)).subscribe(observer))

    return subscription
  })
}

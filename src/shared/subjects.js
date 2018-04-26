import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import { Subject } from 'rxjs/Subject'
import { filter, map, withLatestFrom } from 'rxjs/operators'

export function LockedSubject () {
  let locked = false
  const locked$ = new BehaviorSubject(false)

  return Object.assign(locked$, {
    lock (key$) {
      if (locked) {
        return false
      }

      this.next(true)

      const finish = () => {
        locked = false
        this.next(false)
      }

      key$.subscribe({
        next: finish,
        complete: finish,
        error: finish
      })

      return true
    }
  })
}

export const unless = locked$ => source$ => source$.pipe(
  withLatestFrom(locked$),
  filter(([event, locked]) => !locked),
  map(([event, locked]) => event)
)

export function ToggleSubject (initial = true) {
  let enabled = initial
  const enabled$ = new Subject(initial)
  const _next = enabled$.next

  return Object.assign(enabled$, {
    toggle () {
      enabled = !enabled
      _next.call(enabled$, enabled)
    },

    next (value) {
      this.toggle()
    },

    subscribeWith (onEnabled, onDisabled) {
      this.pipe(
        filter(value => value === true)
      ).subscribe(onEnabled)

      this.pipe(
        filter(value => value === false)
      ).subscribe(onDisabled)
    }
  })
}

export const toggle = toggle$ => source$ => source$.pipe(
  withLatestFrom(toggle$),
  filter(([event, enabled]) => !enabled),
  map(([event, enabled]) => event)
)

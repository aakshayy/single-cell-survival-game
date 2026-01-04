/**
 * Event emitter for loose coupling between components
 */

export class EventEmitter {
    #listeners = new Map();

    subscribe(event, callback) {
        if (!this.#listeners.has(event)) {
            this.#listeners.set(event, new Set());
        }
        this.#listeners.get(event).add(callback);

        // Return unsubscribe function
        return () => this.#listeners.get(event).delete(callback);
    }

    emit(event, data) {
        this.#listeners.get(event)?.forEach(cb => cb(data));
    }

    clear() {
        this.#listeners.clear();
    }
}

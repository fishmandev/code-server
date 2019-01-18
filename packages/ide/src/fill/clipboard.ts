import { IDisposable } from "@coder/disposable";
import { Emitter } from "@coder/events";

/**
 * Native clipboard.
 */
export class Clipboard {

	private readonly enableEmitter: Emitter<boolean> = new Emitter();
	private _isEnabled: boolean = false;

	/**
	 * Ask for permission to use the clipboard.
	 */
	public initialize(): void {
		// tslint:disable no-any
		const navigatorClip = (navigator as any).clipboard;
		const navigatorPerms = (navigator as any).permissions;
		// tslint:enable no-any
		if (navigatorClip && navigatorPerms) {
			navigatorPerms.query({
				name: "clipboard-read",
			}).then((permissionStatus: {
				onchange: () => void,
				state: "denied" | "granted" | "prompt",
			}) => {
				const updateStatus = (): void => {
					this._isEnabled = permissionStatus.state !== "denied";
					this.enableEmitter.emit(this.isEnabled);
				};
				updateStatus();
				permissionStatus.onchange = (): void => {
					updateStatus();
				};
			});
		}
	}

	/**
	 * Return true if the native clipboard is supported.
	 */
	public get isSupported(): boolean {
		// tslint:disable no-any
		return typeof navigator !== "undefined"
			&& typeof (navigator as any).clipboard !== "undefined"
			&& typeof (navigator as any).clipboard.readText !== "undefined";
		// tslint:enable no-any
	}

	/**
	 * Register a function to be called when the native clipboard is
	 * enabled/disabled.
	 */
	public onPermissionChange(cb: (enabled: boolean) => void): IDisposable {
		return this.enableEmitter.event(cb);
	}

	/**
	 * Read text from the clipboard.
	 */
	public readText(): Promise<string> {
		return this.instance ? this.instance.readText() : Promise.resolve("");
	}

	/**
	 * Write text to the clipboard.
	 */
	public writeText(value: string): Promise<void> {
		return this.instance
			? this.instance.writeText(value)
			: this.writeTextFallback(value);
	}

	/**
	 * Return true if the clipboard is currently enabled.
	 */
	public get isEnabled(): boolean {
		return !!this._isEnabled;
	}

	/**
	 * Return clipboard instance if there is one.
	 */
	private get instance(): ({
		readText(): Promise<string>;
		writeText(value: string): Promise<void>;
	}) | undefined {
		// tslint:disable-next-line no-any
		return this.isSupported ? (navigator as any).clipboard : undefined;
	}

	/**
	 * Fallback for writing text to the clipboard.
	 * Taken from https://hackernoon.com/copying-text-to-clipboard-with-javascript-df4d4988697f
	 */
	private writeTextFallback(value: string): Promise<void> {
		// Note the current focus and selection.
		const active = document.activeElement as HTMLElement;
		const selection = document.getSelection();
		const selected = selection && selection.rangeCount > 0
			? selection.getRangeAt(0)
			: false;

		// Insert a hidden textarea to put the text to copy in.
		const el = document.createElement("textarea");
		el.value = value;
		el.setAttribute("readonly", "");
		el.style.position = "absolute";
		el.style.left = "-9999px";
		document.body.appendChild(el);

		// Select the textarea and execute a copy (this will only work as part of a
		// user interaction).
		el.select();
		document.execCommand("copy");

		// Remove the textarea and put focus and selection back to where it was
		// previously.
		document.body.removeChild(el);
		active.focus();
		if (selected && selection) {
			selection.removeAllRanges();
			selection.addRange(selected);
		}

		return Promise.resolve();
	}

}

// Global clipboard instance since it's used in the Electron fill.
export const clipboard = new Clipboard();

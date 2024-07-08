import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	MarkdownView,
} from "obsidian";

import "./styles.css";

interface NoteTimeTracking {
	[notePath: string]: number; // Tracks the total time spent on each note in milliseconds
}

interface TimeTrackerSettings {
	startTime: number | null;
	currentNote: string | null;
	dateHeader: string;
	durationHeader: string;
	logSectionHeader: string;
	timeTracking: NoteTimeTracking;
}

const DEFAULT_SETTINGS: TimeTrackerSettings = {
	startTime: null,
	currentNote: null,
	dateHeader: "Starting date",
	durationHeader: "Overall duration",
	logSectionHeader: "Time Tracking Log",
	timeTracking: {},
};

export default class TimeTrackerPlugin extends Plugin {
	settings: TimeTrackerSettings;
	statusBarItemEl: HTMLElement;

	async onload() {
		console.log("Loading Time Tracker Plugin");

		await this.loadSettings();

		this.addCommand({
			id: "start-tracking-time",
			name: "Simple Time tracking plugin: Start Tracking Time",
			callback: () => this.startTrackingTime(),
		});

		this.addCommand({
			id: "stop-tracking-time",
			name: "Simple Time tracking plugin: Stop Tracking Time",
			callback: () => this.stopTrackingTime(),
		});

		this.addSettingTab(new TimeTrackerSettingTab(this.app, this));

		this.statusBarItemEl = this.addStatusBarItem();
		this.updateStatusBar();
	}

	onunload() {
		console.log("Unloading Time Tracker Plugin");
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	startTrackingTime() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("No active file to start tracking time");
			return;
		}
		this.settings.startTime = Date.now();
		this.settings.currentNote = activeFile.path;
		this.saveSettings();
		new Notice("Time tracking started");
	}

	async stopTrackingTime() {
		if (!this.settings.startTime || !this.settings.currentNote) {
			new Notice("No tracking session in progress");
			return;
		}

		const currentTime = Date.now();
		const elapsedTime = currentTime - this.settings.startTime;
		this.settings.startTime = null;

		if (this.settings.timeTracking[this.settings.currentNote]) {
			this.settings.timeTracking[this.settings.currentNote] +=
				elapsedTime;
		} else {
			this.settings.timeTracking[this.settings.currentNote] = elapsedTime;
		}

		const activeLeaf = this.app.workspace.activeLeaf;
		if (activeLeaf) {
			const view = activeLeaf.view;
			if (view instanceof MarkdownView) {
				const editor: any = view.editor;
				this.logTimeToEditor(editor, elapsedTime);
			} else {
				new Notice("No active Markdown file to log time");
			}
		} else {
			new Notice("No active file to log time");
		}

		this.settings.currentNote = null;
		this.updateStatusBar();
		await this.saveSettings();
	}

	logTimeToEditor(editor: CodeMirror.Editor, elapsedTime: number) {
		const minutes = Math.round(elapsedTime / 6000) / 10; // Rounde// Example variable (you can replace this with your actual calculation)

		// Calculate hours, minutes, and seconds
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = Math.floor(minutes % 60);
		const remainingSeconds = Math.round((minutes % 1) * 60);

		// Format the components to ensure they have two digits
		const formattedHours = String(hours).padStart(2, "0");
		const formattedMinutes = String(remainingMinutes).padStart(2, "0");
		const formattedSeconds = String(remainingSeconds).padStart(2, "0");

		// Construct the final string
		const formattedTime = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;

		const logEntry = `| ${new Date().toLocaleString()} | ${formattedTime} |\n`;

		const tableHeader = `| ${this.settings.dateHeader} | ${this.settings.durationHeader} |\n|------|----------|\n`;
		const logSectionHeader = `## ${this.settings.logSectionHeader}`;

		const doc = editor.getDoc();
		const cursor = doc.getCursor();

		let content = doc.getValue();
		let newContent = content;
		if (String(content).includes(String(logSectionHeader))) {
			newContent = `${tableHeader}${logEntry}`;
		} else {
			newContent = `${logSectionHeader}\n\n${tableHeader}${logEntry}`;
		}

		doc.replaceRange(`\n\n${newContent}\n`, cursor);
		new Notice("Time logged successfully");
	}

	updateStatusBar() {
		this.statusBarItemEl.empty();
		const startButton = this.statusBarItemEl.createEl("button", {
			text: "Start Tracking",
		});
		startButton.classList.add("startButton");
		const stopButton = this.statusBarItemEl.createEl("button", {
			text: "Stop Tracking",
		});
		stopButton.addEventListener("click", () => this.stopTrackingTime());
		stopButton.classList.add("stopButton");
		startButton.addEventListener("click", () => {
			this.startTrackingTime();
			startButton.disabled = true;
		});
	}
}

class TimeTrackerSettingTab extends PluginSettingTab {
	plugin: TimeTrackerPlugin;

	constructor(app: App, plugin: TimeTrackerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", {
			text: "Settings for Time Tracker Plugin",
		});

		new Setting(containerEl)
			.setName("Date Header")
			.setDesc("Header for the date column in the time tracking table")
			.addText((text) =>
				text
					.setPlaceholder("Enter date header")
					.setValue(this.plugin.settings.dateHeader)
					.onChange(async (value) => {
						this.plugin.settings.dateHeader = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Duration Header")
			.setDesc(
				"Header for the duration column in the time tracking table"
			)
			.addText((text) =>
				text
					.setPlaceholder("Enter duration header")
					.setValue(this.plugin.settings.durationHeader)
					.onChange(async (value) => {
						this.plugin.settings.durationHeader = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Log Section Header")
			.setDesc("Header for the log section in the markdown file")
			.addText((text) =>
				text
					.setPlaceholder("Enter log section header")
					.setValue(this.plugin.settings.logSectionHeader)
					.onChange(async (value) => {
						this.plugin.settings.logSectionHeader = value;
						await this.plugin.saveSettings();
					})
			);
	}
}

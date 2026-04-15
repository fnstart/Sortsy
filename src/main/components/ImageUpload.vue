<script setup lang="ts">
import { ref } from "vue";
import { ImagePlus, X } from "lucide-vue-next";

defineProps<{
    previewUrl: string | null;
}>();

const emit = defineEmits<{
    clear: [];
    select: [file: File];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const error = ref("");

const acceptedTypes = new Set([
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
]);
const acceptedExtensions = [".gif", ".jpeg", ".jpg", ".png", ".webp"];
const maxFileSize = 5 * 1024 * 1024;

function openPicker() {
    fileInput.value?.click();
}

function validateImage(file: File) {
    const name = file.name.toLowerCase();
    const hasValidType = acceptedTypes.has(file.type);
    const hasValidExtension = acceptedExtensions.some((extension) =>
        name.endsWith(extension),
    );

    if (!hasValidType || !hasValidExtension) {
        return "Choose a PNG, JPG, WEBP, or GIF image.";
    }

    if (file.size > maxFileSize) {
        return "Image must be 5MB or smaller.";
    }

    return "";
}

function selectFile(file: File | undefined) {
    if (!file) {
        return;
    }

    const validationError = validateImage(file);

    if (validationError) {
        error.value = validationError;
        return;
    }

    error.value = "";
    emit("select", file);
}

function handleChange(event: Event) {
    const input = event.target as HTMLInputElement;

    selectFile(input.files?.[0]);
    input.value = "";
}

function handleDrop(event: DragEvent) {
    selectFile(event.dataTransfer?.files[0]);
}

function clearImage() {
    error.value = "";
    emit("clear");
}
</script>

<template>
    <div class="grid gap-1.5">
        <button
            type="button"
            class="group relative flex w-full items-center gap-3 rounded-md border-2 border-dotted border-border bg-card/50 cursor-pointer px-2 py-2 text-left opacity-80 transition-all duration-200 hover:border-primary/60 hover:opacity-100 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
            @click="openPicker"
            @dragover.prevent
            @drop.prevent="handleDrop"
        >
            <img
                v-if="previewUrl"
                :src="previewUrl"
                alt="Selected card image"
                draggable="false"
                class="pointer-events-none size-20 select-none rounded-md object-cover"
            />
            <div
                v-else
                class="flex size-20 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors group-hover:text-foreground"
            >
                <ImagePlus class="size-7" />
            </div>

            <span class="grid gap-1 pr-8">
                <span class="text-sm font-medium">
                    {{ previewUrl ? "Change image" : "Upload image" }}
                </span>
                <span class="text-xs text-muted-foreground">
                    PNG, JPG, WEBP, or GIF up to 5MB.
                </span>
            </span>

            <ImagePlus
                class="absolute right-2 top-2 size-4 text-muted-foreground"
            />
        </button>

        <div class="flex items-center justify-between gap-2">
            <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
            <span v-else class="text-xs text-muted-foreground">
                Click or drop an image.
            </span>

            <button
                v-if="previewUrl"
                type="button"
                class="flex flex-row items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                @click="clearImage"
            >
                Remove
            </button>
        </div>

        <input
            ref="fileInput"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            class="hidden"
            @change="handleChange"
        />
    </div>
</template>

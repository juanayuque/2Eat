// app/+html.js
import { ScrollViewStyleReset } from 'expo-router/html';
import { StyleSheet } from 'react-native';

// Import the specific font families you are using
import {
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';

// A simple function to create the font-face rules
function FontFaces() {
  // This is a trick to get the generated CSS from the icon families.
  // It creates a temporary component with a style that uses the font family.
  StyleSheet.registerComponent('FontAwesome', () => Ionicons);
  StyleSheet.registerComponent('MaterialCommunityIcons', () => MaterialCommunityIcons);

  // Then, we can extract the generated stylesheet.
  const sheet = StyleSheet.getSheet();

  return <style dangerouslySetInnerHTML={{ __html: sheet.textContent }} />;
}

// This is the main component that will be rendered to HTML.
export default function Root({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-g" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {/*
          This is the most important part:
          Inject the generated font-face rules into the head of the page.
        */}
        <FontFaces />

        {/*
          Disable body scrolling which are traditionally handled by native code.
          However, web browsers require a different approach.
        */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}